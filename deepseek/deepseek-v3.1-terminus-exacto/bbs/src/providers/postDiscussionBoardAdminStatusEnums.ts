import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardStatusEnumCollector } from "../collectors/DiscussionBoardStatusEnumCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumTransformer } from "../transformers/DiscussionBoardStatusEnumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminStatusEnums(props: {
  admin: AdminPayload;
  body: IDiscussionBoardStatusEnum.ICreate;
}): Promise<IDiscussionBoardStatusEnum> {
  const created = await MyGlobal.prisma.discussion_board_status_enums.create({
    data: await DiscussionBoardStatusEnumCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardStatusEnumTransformer.select(),
  });
  return await DiscussionBoardStatusEnumTransformer.transform(created);
}
