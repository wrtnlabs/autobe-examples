import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmMemberSessionAtSummaryTransformer } from "../transformers/ErpHrmMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmGuestSessions(props: {
  guest: GuestPayload;
  body: IErpHrmMemberSession.IRequest;
}): Promise<IPageIErpHrmMemberSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        member: {
          OR: [
            {
              display_name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        },
      }),
    ...(props.body.member_ids !== undefined &&
      props.body.member_ids.length > 0 && {
        erp_hrm_member_id: { in: props.body.member_ids },
      }),
    ...(props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_start !== undefined && {
              gte: props.body.created_at_start,
            }),
            ...(props.body.created_at_end !== undefined && {
              lt: props.body.created_at_end,
            }),
          },
        }
      : {}),
    ...(props.body.status === "active" && {
      expired_at: { gt: new Date().toISOString() },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: new Date().toISOString() },
    }),
  } satisfies Prisma.erp_hrm_member_sessionsWhereInput;
  const records = await MyGlobal.prisma.erp_hrm_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmMemberSessionAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.erp_hrm_member_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmMemberSessionAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
// import { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmGuestSessions(props: {
//   guest: GuestPayload;
//   body: IErpHrmMemberSession.IRequest;
// }): Promise<IPageIErpHrmMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_member_sessions.findMany({
//     ...ErpHrmMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------