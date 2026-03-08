import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardMemberCollector } from "../collectors/DiscussionBoardMemberCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardMemberTransformer } from "../transformers/DiscussionBoardMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminActors(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardMember> {
  const created = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      ...(await DiscussionBoardMemberCollector.collect({ body: props.body })),
      password_hash: await PasswordUtil.hash(props.body.password_hash),
    },
    ...DiscussionBoardMemberTransformer.select(),
  });
  return await DiscussionBoardMemberTransformer.transform(created);
}
