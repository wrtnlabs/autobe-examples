import { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminsRequestCollector } from "../collectors/DiscussionBoardAdminsRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberAdminRequests(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdminsRequest.ICreate;
}): Promise<IDiscussionBoardAdminsRequest> {
  // Check if user already has a pending request
  const existingRequest =
    await MyGlobal.prisma.discussion_board_admins_requests.findFirst({
      where: {
        member_id: props.member.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest) {
    throw new HttpException(
      "You already have a pending administrator request",
      409,
    );
  }
  // Use collector to transform Create DTO to Prisma input
  const input = await DiscussionBoardAdminsRequestCollector.collect({
    body: props.body,
    member: {
      id: props.member.id as string & tags.Format<"uuid">,
    },
  });
  // Create the request record
  const created = await MyGlobal.prisma.discussion_board_admins_requests.create(
    {
      data: input,
      select: {
        id: true,
        member_id: true,
        admin_id: true,
        super_admin_id: true,
        reason: true,
        status: true,
        created_at: true,
        approved_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  // Return the created record with proper type conversion
  return {
    id: created.id as string & tags.Format<"uuid">,
    member_id: created.member_id as string & tags.Format<"uuid">,
    admin_id: created.admin_id
      ? (created.admin_id as string & tags.Format<"uuid">)
      : null,
    super_admin_id: created.super_admin_id
      ? (created.super_admin_id as string & tags.Format<"uuid">)
      : null,
    reason: created.reason,
    status: created.status as "pending" | "approved" | "rejected",
    created_at: toISOStringSafe(created.created_at),
    approved_at: created.approved_at
      ? toISOStringSafe(created.approved_at)
      : null,
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
