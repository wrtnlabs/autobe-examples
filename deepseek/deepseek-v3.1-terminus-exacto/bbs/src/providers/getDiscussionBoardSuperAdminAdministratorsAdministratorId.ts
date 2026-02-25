import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAdministratorsAdministratorId(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdmin> {
  const administrator =
    await MyGlobal.prisma.discussion_board_section_administrators.findUniqueOrThrow(
      {
        where: {
          id: props.administratorId,
          deleted_at: null,
        },
        ...DiscussionBoardSuperAdminTransformer.select(),
      },
    );
  return await DiscussionBoardSuperAdminTransformer.transform(administrator);
}
