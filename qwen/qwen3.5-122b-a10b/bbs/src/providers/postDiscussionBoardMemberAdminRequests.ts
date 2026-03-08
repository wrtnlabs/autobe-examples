import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminRequestCollector } from "../collectors/DiscussionBoardAdminRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberAdminRequests(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdminRequest.ICreate;
}): Promise<IDiscussionBoardAdminRequest> {
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.member.id },
    });
  try {
    const created =
      await MyGlobal.prisma.discussion_board_admin_requests.create({
        data: await DiscussionBoardAdminRequestCollector.collect({
          body: props.body,
          discussionBoardMembers: member,
        }),
        ...DiscussionBoardAdminRequestTransformer.select(),
      });
    return await DiscussionBoardAdminRequestTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "You already have a pending administrator request",
        409,
      );
    }
    throw error;
  }
}
