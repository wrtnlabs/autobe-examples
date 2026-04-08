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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const cursorSkip = props.body.cursor
    ? parseInt(props.body.cursor.split(":")[0], 10)
    : undefined;
  const effectiveSkip = cursorSkip !== undefined ? cursorSkip : skip;
  const whereInput: Prisma.hrm_platform_member_password_resetsWhereInput = {
    deleted_at: null,
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
  };
  if (props.body.status) {
    const now = toISOStringSafe(new Date());
    if (props.body.status === "active") {
      whereInput.NOT = {
        used_at: { not: null },
        expired_at: { gte: now },
      };
    } else if (props.body.status === "used") {
      whereInput.used_at = { not: null };
    } else if (props.body.status === "expired") {
      whereInput.expired_at = { lte: now };
    }
  }
  if (props.body.created_before) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = { lt: props.body.created_before };
    } else {
      const existing = whereInput.created_at;
      if (
        typeof existing === "object" &&
        existing !== null &&
        "lt" in existing
      ) {
        whereInput.created_at = {
          lt: existing.lt,
          gt: props.body.created_before,
        };
      } else if (
        typeof existing === "object" &&
        existing !== null &&
        "gt" in existing
      ) {
        whereInput.created_at = {
          gt: existing.gt,
          lt: props.body.created_before,
        };
      }
    }
  }
  if (props.body.created_after) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = { gt: props.body.created_after };
    } else {
      const existing = whereInput.created_at;
      if (
        typeof existing === "object" &&
        existing !== null &&
        "lt" in existing
      ) {
        whereInput.created_at = {
          lt: existing.lt,
          gt: props.body.created_after,
        };
      } else if (
        typeof existing === "object" &&
        existing !== null &&
        "gt" in existing
      ) {
        whereInput.created_at = {
          gt: existing.gt,
          lt: props.body.created_after,
        };
      }
    }
  }
  if (props.body.expired_before) {
    if (whereInput.expired_at === undefined) {
      whereInput.expired_at = { lt: props.body.expired_before };
    } else {
      const existing = whereInput.expired_at;
      if (
        typeof existing === "object" &&
        existing !== null &&
        "lt" in existing
      ) {
        whereInput.expired_at = {
          lt: existing.lt,
          gt: props.body.expired_before,
        };
      } else if (
        typeof existing === "object" &&
        existing !== null &&
        "gt" in existing
      ) {
        whereInput.expired_at = {
          gt: existing.gt,
          lt: props.body.expired_before,
        };
      }
    }
  }
  if (props.body.expired_after) {
    if (whereInput.expired_at === undefined) {
      whereInput.expired_at = { gt: props.body.expired_after };
    } else {
      const existing = whereInput.expired_at;
      if (
        typeof existing === "object" &&
        existing !== null &&
        "lt" in existing
      ) {
        whereInput.expired_at = {
          lt: existing.lt,
          gt: props.body.expired_after,
        };
      } else if (
        typeof existing === "object" &&
        existing !== null &&
        "gt" in existing
      ) {
        whereInput.expired_at = {
          gt: existing.gt,
          lt: props.body.expired_after,
        };
      }
    }
  }
  if (props.body.used !== undefined) {
    if (props.body.used) {
      whereInput.used_at = { not: null };
    } else {
      whereInput.used_at = null;
    }
  }
  const records =
    await MyGlobal.prisma.hrm_platform_member_password_resets.findMany({
      ...HrmPlatformMemberPasswordResetAtSummaryTransformer.select(),
      where: whereInput,
      orderBy:
        props.body.sort === "used_at"
          ? { used_at: props.body.direction ?? "desc" }
          : props.body.sort === "expired_at"
            ? { expired_at: props.body.direction ?? "desc" }
            : { created_at: props.body.direction ?? "desc" },
      skip: effectiveSkip,
      take: limit,
    });
  const total = await MyGlobal.prisma.hrm_platform_member_password_resets.count(
    {
      where: whereInput,
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformMemberPasswordResetAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformMemberPasswordReset.ISummary;
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