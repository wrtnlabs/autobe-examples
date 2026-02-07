import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorCapabilityTransformer } from "../transformers/DiscussionBoardAdministratorCapabilityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAdministratorsAdministratorIdCapabilitiesCapabilityId(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
  capabilityId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorCapability> {
  const capability =
    await MyGlobal.prisma.discussion_board_administrator_capabilities.findUnique(
      {
        where: {
          id: props.capabilityId,
          discussion_board_administrator_id: props.administratorId,
          deleted_at: null,
        },
        ...DiscussionBoardAdministratorCapabilityTransformer.select(),
      },
    );
  if (!capability) {
    throw new HttpException(
      "Capability not found or does not belong to the specified administrator",
      404,
    );
  }
  return await DiscussionBoardAdministratorCapabilityTransformer.transform(
    capability,
  );
}
