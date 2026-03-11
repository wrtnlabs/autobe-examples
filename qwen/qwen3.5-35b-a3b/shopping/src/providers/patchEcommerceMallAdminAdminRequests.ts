import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestRequestAtSummaryTransformer } from "../transformers/EcommerceMallAdminRequestRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequestRequest.IRequest;
}): Promise<IPageIEcommerceMallAdminRequestRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const dateConditions: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.from_date !== undefined) {
    dateConditions.gte = new Date(props.body.from_date);
  }
  if (props.body.to_date !== undefined) {
    dateConditions.lte = new Date(props.body.to_date);
  }
  const whereInput: Prisma.ecommerce_mall_admin_request_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.request_status !== undefined && {
      request_status: { in: props.body.request_status },
    }),
    ...(props.body.requester_type !== undefined && {
      OR: props.body.requester_type.map((type) =>
        type === "customer"
          ? {
              customerRequests: {
                some: {
                  is: true,
                },
              },
            }
          : {
              sellerRequests: {
                some: {
                  is: true,
                },
              },
            },
      ) as Prisma.ecommerce_mall_admin_request_requestsWhereInput[],
    }),
    ...(Object.keys(dateConditions).length > 0 && {
      created_at: dateConditions,
    }),
  } satisfies Prisma.ecommerce_mall_admin_request_requestsWhereInput;
  const orderByCondition: Prisma.ecommerce_mall_admin_request_requestsOrderByWithRelationInput =
    props.body.sort_by === "request_status"
      ? {
          request_status:
            props.body.sort_order === "descending" ? "desc" : "asc",
        }
      : {
          created_at: props.body.sort_order === "descending" ? "desc" : "asc",
        };
  const data =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByCondition,
      ...EcommerceMallAdminRequestRequestAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(data, (item) =>
    EcommerceMallAdminRequestRequestAtSummaryTransformer.transform(item),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
