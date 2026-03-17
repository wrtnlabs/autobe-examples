import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort;
  const cursor = props.body.cursor;
  // Determine pagination strategy and calculate skip/current page
  const useCursorPagination = cursor !== undefined && cursor !== null;
  const currentPage = useCursorPagination ? 1 : (props.body.page ?? 1);
  const skip = useCursorPagination ? 0 : (currentPage - 1) * limit;
  // Build where clause with filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined &&
      props.body.email.length > 0 && {
        email: {
          contains: props.body.email,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
    ...(props.body.grade !== undefined && { grade: props.body.grade }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.nickname !== undefined &&
      props.body.nickname.length > 0 && {
        nickname: {
          contains: props.body.nickname,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
  } satisfies Prisma.ecommerce_mall_adminsWhereInput;
  // Handle ordering based on sort parameter
  const orderByInput = (
    sort === "created_at"
      ? { created_at: "asc" as const }
      : sort === "-created_at"
        ? { created_at: "desc" as const }
        : sort === "grade"
          ? { grade: "asc" as const }
          : sort === "-grade"
            ? { grade: "desc" as const }
            : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_adminsOrderByWithRelationInput;
  // Fetch paginated data
  const dbArgs = {
    where: whereInput,
    orderBy: orderByInput,
    ...EcommerceMallAdminAtSummaryTransformer.select(),
  } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
  const data = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    ...dbArgs,
    ...(useCursorPagination
      ? { cursor: { id: cursor }, skip: 1, take: limit }
      : { skip, take: limit }),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallAdminAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
