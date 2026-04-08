import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformMemberPasswordResetAtSummaryTransformer } from "../transformers/HrmPlatformMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberPasswordResets(props: {
  member: MemberPayload;
  body: IHrmPlatformMemberPasswordReset.IRequest;
}): Promise<IPageIHrmPlatformMemberPasswordReset.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    100 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip: number = (page - 1) * limit;
  const buildWhereClause =
    (): Prisma.hrm_platform_member_password_resetsWhereInput => {
      const now: string & tags.Format<"date-time"> =
        new Date().toISOString() as string & tags.Format<"date-time">;
      const conditions: Array<Prisma.hrm_platform_member_password_resetsWhereInput> =
        [];
      if (props.body.member_id !== undefined) {
        conditions.push({ member_id: props.body.member_id });
      }
      if (props.body.status === "active") {
        conditions.push({
          used_at: null,
          expired_at: {
            gt: now,
          },
        });
      } else if (props.body.status === "used") {
        conditions.push({
          used_at: {
            not: null,
          },
        });
      } else if (props.body.status === "expired") {
        conditions.push({
          expired_at: {
            lt: now,
          },
        });
      }
      if (props.body.created_before !== undefined) {
        conditions.push({
          created_at: { lte: props.body.created_before! },
        });
      }
      if (props.body.created_after !== undefined) {
        conditions.push({
          created_at: { gte: props.body.created_after! },
        });
      }
      if (props.body.expired_before !== undefined) {
        conditions.push({
          expired_at: { lte: props.body.expired_before! },
        });
      }
      if (props.body.expired_after !== undefined) {
        conditions.push({
          expired_at: { gte: props.body.expired_after! },
        });
      }
      if (props.body.used !== undefined) {
        if (props.body.used) {
          conditions.push({ used_at: { not: null } });
        } else {
          conditions.push({ used_at: null });
        }
      }
      if (conditions.length === 0) {
        return {};
      }
      if (conditions.length === 1) {
        return conditions[0];
      }
      return { AND: conditions };
    };
  const whereInput: Prisma.hrm_platform_member_password_resetsWhereInput =
    buildWhereClause();
  const sort: "created_at" | "used_at" | "expired_at" =
    props.body.sort ?? "created_at";
  const direction: "asc" | "desc" = props.body.direction ?? "desc";
  const orderByInput: Prisma.hrm_platform_member_password_resetsOrderByWithRelationInput =
    {
      [sort]: direction,
    } satisfies Prisma.hrm_platform_member_password_resetsOrderByWithRelationInput;
  const records: Array<HrmPlatformMemberPasswordResetAtSummaryTransformer.Payload> =
    await MyGlobal.prisma.hrm_platform_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformMemberPasswordResetAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.hrm_platform_member_password_resets.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformMemberPasswordResetAtSummaryTransformer.transform,
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
// import { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
// import { IPageIHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IHrmPlatformMemberPasswordReset.IRequest;
// }): Promise<IPageIHrmPlatformMemberPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_member_password_resets.findMany({
//     ...HrmPlatformMemberPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformMemberPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------