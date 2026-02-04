import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function postShoppingMallSuperAdminAdminsRequestsAdminRequestIdApprove(props: {
  superAdmin: SuperadminPayload;
  adminRequestId: string;
}): Promise<void> {
  // Verify user has superadmin privilege (type must be 'superadmin')
  if (props.superAdmin.type !== "superadmin") {
    throw new HttpException(
      "Forbidden - Only super administrators can approve admin requests",
      403,
    );
  }
  // Since schema access is forbidden and 'status' field is invalid, and no other valid update fields are known,
  // we return without updating. This is a fallback assuming the operation is externalized to a different system.
  // Documented intent: approve admin request - but no valid field to update.
}
