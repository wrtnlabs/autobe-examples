import { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardStatusTypeCollector } from "../collectors/DiscussionBoardStatusTypeCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusTypeTransformer } from "../transformers/DiscussionBoardStatusTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminStatusTypes(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardStatusType.ICreate;
}): Promise<IDiscussionBoardStatusType> {
  // Check for existing status type with same category and code
  const existing =
    await MyGlobal.prisma.discussion_board_status_types.findFirst({
      where: {
        category: props.body.category,
        code: props.body.code,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "Status type with this category and code already exists",
      400,
    );
  }
  // Create new status type using collector
  const created = await MyGlobal.prisma.discussion_board_status_types.create({
    data: await DiscussionBoardStatusTypeCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardStatusTypeTransformer.select(),
  });
  // Transform and return response
  return await DiscussionBoardStatusTypeTransformer.transform(created);
}
