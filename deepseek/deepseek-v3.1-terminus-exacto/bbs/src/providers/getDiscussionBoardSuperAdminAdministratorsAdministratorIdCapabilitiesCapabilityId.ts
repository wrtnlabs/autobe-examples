import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
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
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilitiesCapabilityId(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  capabilityId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorCapability> {
  const capability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findUniqueOrThrow(
      {
        where: {
          id: props.capabilityId,
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
        ...DiscussionBoardAdministratorCapabilityTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorCapabilityTransformer.transform(
    capability,
  );
}
