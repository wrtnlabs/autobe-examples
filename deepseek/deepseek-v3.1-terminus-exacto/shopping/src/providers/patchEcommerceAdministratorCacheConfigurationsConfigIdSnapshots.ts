import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorCacheConfigurationsConfigIdSnapshots(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationSnapshot.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationSnapshot.ISummary> {
  // Verify cache configuration exists
  await MyGlobal.prisma.ecommerce_cache_configurations.findUniqueOrThrow({
    where: { id: props.configId },
  });
  // Build WHERE clause based on available schema fields
  const whereInput = {
    ecommerce_cache_configuration_id: props.configId,
    ...(props.body.status && { changed_by_actor_type: props.body.status }),
    ...(props.body.suspension_start_date_min && {
      created_at: { gte: props.body.suspension_start_date_min },
    }),
    ...(props.body.suspension_start_date_max && {
      created_at: { lte: props.body.suspension_start_date_max },
    }),
    ...(props.body.suspension_reason_search && {
      change_reason: {
        contains: props.body.suspension_reason_search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.ecommerce_cache_configuration_snapshotsWhereInput;
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute queries sequentially
  const data =
    await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    });
  const total =
    await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.count({
      where: whereInput,
    });
  // Collect unique actor IDs by type
  const sellerIds: string[] = [];
  const administratorIds: string[] = [];
  data.forEach((snapshot) => {
    if (snapshot.changed_by_actor_type === "seller") {
      sellerIds.push(snapshot.changed_by_actor_id);
    } else if (snapshot.changed_by_actor_type === "administrator") {
      administratorIds.push(snapshot.changed_by_actor_id);
    }
  });
  // Batch fetch actors
  const [sellers, administrators] = await Promise.all([
    sellerIds.length > 0
      ? MyGlobal.prisma.ecommerce_sellers.findMany({
          where: { id: { in: sellerIds } },
        })
      : Promise.resolve([]),
    administratorIds.length > 0
      ? MyGlobal.prisma.ecommerce_administrators.findMany({
          where: { id: { in: administratorIds } },
        })
      : Promise.resolve([]),
  ]);
  // Create lookup maps
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const administratorMap = new Map(administrators.map((a) => [a.id, a]));
  // Transform each snapshot
  const transformedData = data.map((snapshot) => {
    let sellerSummary: IEcommerceSeller.ISummary | null = null;
    let administratorSummary: IEcommerceAdministrator.ISummary | null = null;
    if (snapshot.changed_by_actor_type === "seller") {
      const seller = sellerMap.get(snapshot.changed_by_actor_id);
      if (seller) {
        sellerSummary = {
          id: seller.id as string & tags.Format<"uuid">,
          email: seller.email as string & tags.Format<"email">,
          shop_name: seller.shop_name,
          shop_description: seller.shop_description,
          logo_image_url: seller.logo_image_url,
          account_status: seller.account_status,
          created_at: toISOStringSafe(seller.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceSeller.ISummary;
      }
    } else if (snapshot.changed_by_actor_type === "administrator") {
      const admin = administratorMap.get(snapshot.changed_by_actor_id);
      if (admin) {
        administratorSummary = {
          id: admin.id as string & tags.Format<"uuid">,
          email: admin.email as string & tags.Format<"email">,
          created_at: toISOStringSafe(admin.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceAdministrator.ISummary;
      }
    }
    // Map cache snapshot fields to DTO structure
    return {
      id: snapshot.id as string & tags.Format<"uuid">,
      suspension_reason: snapshot.change_reason ?? "",
      suspension_start_date: toISOStringSafe(snapshot.created_at) as string &
        tags.Format<"date-time">,
      suspension_end_date: null, // Not available in cache snapshot schema
      status: snapshot.changed_by_actor_type,
      seller:
        sellerSummary satisfies IEcommerceSeller.ISummary | null as IEcommerceSeller.ISummary,
      administrator:
        administratorSummary satisfies IEcommerceAdministrator.ISummary | null as IEcommerceAdministrator.ISummary,
    } satisfies IEcommerceCacheConfigurationSnapshot.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData satisfies IEcommerceCacheConfigurationSnapshot.ISummary[] as IEcommerceCacheConfigurationSnapshot.ISummary[],
  } satisfies IPageIEcommerceCacheConfigurationSnapshot.ISummary;
}
