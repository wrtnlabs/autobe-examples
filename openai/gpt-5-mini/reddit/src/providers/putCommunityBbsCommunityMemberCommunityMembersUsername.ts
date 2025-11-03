import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function putCommunityBbsCommunityMemberCommunityMembersUsername(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsCommunityMember.IUpdate;
}): Promise<ICommunityBbsCommunityMember.ISummary> {
  const { communityMember, username, body } = props;

  try {
    const target =
      await MyGlobal.prisma.community_bbs_communitymember.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          email: true,
          display_name: true,
          mfa_enabled: true,
          status: true,
          email_verified: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

    if (!target || target.deleted_at) {
      throw new HttpException("Not Found", 404);
    }

    // Authorization: only the account owner may perform updates here
    if (target.id !== communityMember.id) {
      throw new HttpException(
        "Unauthorized: You can only update your own account",
        403,
      );
    }

    const emailWillChange =
      body.email !== undefined &&
      body.email !== null &&
      body.email !== target.email;

    const now = toISOStringSafe(new Date());

    const updated = await MyGlobal.prisma.community_bbs_communitymember.update({
      where: { id: target.id },
      data: {
        ...(body.display_name === undefined
          ? {}
          : { display_name: body.display_name }),
        ...(body.email === undefined
          ? {}
          : body.email === null
            ? {}
            : { email: body.email }),
        ...(body.mfa_enabled === undefined
          ? {}
          : { mfa_enabled: body.mfa_enabled }),
        ...(emailWillChange ? { email_verified: false } : {}),
        updated_at: now,
      },
      select: {
        id: true,
        username: true,
        display_name: true,
        karma: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (emailWillChange) {
      await Promise.all([
        MyGlobal.prisma.community_bbs_communitymember_sessions.updateMany({
          where: { community_bbs_communitymember_id: target.id },
          data: { expired_at: now },
        }),
        MyGlobal.prisma.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            actor_type: "community_member",
            actor_id: communityMember.id,
            entity: "community_member",
            action: "email_changed",
            payload: JSON.stringify({ from: target.email, to: body.email }),
            created_at: now,
            updated_at: now,
          },
        }),
      ]);
    }

    return {
      id: updated.id as string & tags.Format<"uuid">,
      username: updated.username,
      display_name:
        updated.display_name === null
          ? null
          : (updated.display_name ?? undefined),
      karma: updated.karma,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }
}
