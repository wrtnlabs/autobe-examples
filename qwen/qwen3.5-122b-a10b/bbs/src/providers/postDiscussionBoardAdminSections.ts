import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionCollector } from "../collectors/DiscussionBoardSectionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSections(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: props.admin.id },
    },
  );
  const created = await MyGlobal.prisma.discussion_board_sections.create({
    data: await DiscussionBoardSectionCollector.collect({
      body: props.body,
      discussionBoardAdmins: admin,
    }),
    ...DiscussionBoardSectionTransformer.select(),
  });
  return await DiscussionBoardSectionTransformer.transform(created);
}
