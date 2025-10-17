import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminKarmaLedgers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaLedger.ICreate;
}): Promise<ICommunityPlatformKarmaLedger> {
  const now = toISOStringSafe(new Date());
  let created;
  try {
    created = await MyGlobal.prisma.community_platform_karma_ledgers.create({
      data: {
        id: v4(),
        community_platform_member_id: props.body.community_platform_member_id,
        community_platform_community_id:
          props.body.community_platform_community_id ?? null,
        current_karma: props.body.current_karma,
        feature_lock_reason: props.body.feature_lock_reason ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Karma ledger entry already exists for this member/community pair",
        409,
      );
    }
    throw err;
  }
  return {
    id: created.id,
    community_platform_member_id: created.community_platform_member_id,
    community_platform_community_id:
      created.community_platform_community_id ?? null,
    current_karma: created.current_karma,
    feature_lock_reason: created.feature_lock_reason ?? null,
    updated_at: toISOStringSafe(created.updated_at),
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
