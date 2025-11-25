import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorPolicyDocumentsPolicyTypeVersion(props: {
  administrator: AdministratorPayload;
  policyType: string;
  version: string;
}): Promise<void> {
  // Find the policy document that matches the criteria and is not already deleted
  const document =
    await MyGlobal.prisma.community_platform_policy_documents.findFirst({
      where: {
        policy_type: props.policyType,
        version: props.version,
        deleted_at: null,
      },
    });

  if (!document) {
    throw new HttpException(
      "Policy document not found or already deleted.",
      404,
    );
  }

  // Soft-delete: update deleted_at with current timestamp (in ISO8601 string)
  await MyGlobal.prisma.community_platform_policy_documents.update({
    where: {
      id: document.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
