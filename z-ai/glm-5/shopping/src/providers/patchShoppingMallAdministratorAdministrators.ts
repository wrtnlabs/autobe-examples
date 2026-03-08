import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  // Authorization: Only super administrators can access this endpoint
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { grade: true },
    });
  if (adminRecord.grade !== "super") {
    throw new HttpException(
      "Only super administrators can access this endpoint",
      403,
    );
  }
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with proper date range handling
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  const whereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: { contains: props.body.email, mode: "insensitive" as const },
      }),
    ...(props.body.grade !== undefined &&
      props.body.grade !== null && {
        grade: props.body.grade,
      }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.shopping_mall_administratorsWhereInput;
  // Parse sort parameter
  const sortValue = props.body.sort ?? "-created_at";
  const orderByInput = (
    sortValue === "-created_at"
      ? { created_at: "desc" as const }
      : sortValue === "-updated_at"
        ? { updated_at: "desc" as const }
        : sortValue === "-email"
          ? { email: "desc" as const }
          : sortValue === "created_at"
            ? { created_at: "asc" as const }
            : sortValue === "updated_at"
              ? { updated_at: "asc" as const }
              : sortValue === "email"
                ? { email: "asc" as const }
                : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_administratorsOrderByWithRelationInput;
  // Query execution
  const data = await MyGlobal.prisma.shopping_mall_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallAdministratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_administrators.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallAdministratorAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
