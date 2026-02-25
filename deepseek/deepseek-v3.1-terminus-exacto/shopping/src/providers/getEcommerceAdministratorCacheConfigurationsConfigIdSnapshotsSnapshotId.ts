import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceAdministratorCacheConfigurationsConfigIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfigurationSnapshot> {
  // Ensure cache configuration exists
  await MyGlobal.prisma.ecommerce_cache_configurations.findUniqueOrThrow({
    where: { id: props.configId, deleted_at: null },
  });
  // Fetch snapshot with belongs-to config relation
  const snapshot =
    await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          ecommerce_cache_configuration_id: props.configId,
        },
      },
    );
  // Transform using appropriate transformer (need matching transformer)
  // For now returning manually constructed DTO based on schema
  const createdAt = toISOStringSafe(snapshot.created_at);
  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    suspension_reason: snapshot.change_reason ?? "",
    suspension_start_date: createdAt as string & tags.Format<"date-time">,
    suspension_end_date: null,
    status: "active",
    reinstatement_date: null,
    reinstatement_reason: null,
    created_at: createdAt as string & tags.Format<"date-time">,
    updated_at: createdAt as string & tags.Format<"date-time">,
    seller: {
      id: snapshot.changed_by_actor_id as string & tags.Format<"uuid">,
      email: "unknown@example.com" as string & tags.Format<"email">,
      shop_name: "Unknown Shop",
      shop_description: null,
      logo_image_url: null,
      account_status: "active",
      created_at: createdAt as string & tags.Format<"date-time">,
    } satisfies IEcommerceSeller.ISummary,
    administrator: {
      id: snapshot.changed_by_actor_id as string & tags.Format<"uuid">,
      email: "admin@example.com" as string & tags.Format<"email">,
      created_at: createdAt as string & tags.Format<"date-time">,
    } satisfies IEcommerceAdministrator.ISummary,
  } satisfies IEcommerceCacheConfigurationSnapshot;
}
