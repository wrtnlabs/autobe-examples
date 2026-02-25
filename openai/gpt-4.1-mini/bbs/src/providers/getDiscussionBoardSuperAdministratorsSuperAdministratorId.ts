import { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSuperAdministratorTransformer } from "../transformers/DiscussionBoardSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorsSuperAdministratorId(props: {
  superAdministratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdministrator> {
  const record =
    await MyGlobal.prisma.discussion_board_super_administrators.findUniqueOrThrow(
      {
        where: { id: props.superAdministratorId },
        ...DiscussionBoardSuperAdministratorTransformer.select(),
      },
    );
  return await DiscussionBoardSuperAdministratorTransformer.transform(record);
}
