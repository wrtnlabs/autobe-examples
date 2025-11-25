import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postDiscussionBoardRegisteredUserSystemConfigurations(props: {
  registeredUser: RegisteredUserPayload;
  body: IDiscussionBoardConfiguration.ICreate;
}): Promise<IDiscussionBoardConfiguration> {
  const { body } = props;
  const key = body;
  const value = "true";

  const existingConfig =
    await MyGlobal.prisma.discussion_board_configurations.findFirst({
      where: { key },
    });
  if (existingConfig) {
    throw new HttpException(`Configuration key '${key}' already exists`, 400);
  }

  const newConfig =
    await MyGlobal.prisma.discussion_board_configurations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        key,
        value,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    key: newConfig.key,
    value: newConfig.value,
  } satisfies IDiscussionBoardConfiguration;
}
