import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorPolicyDocumentsPolicyTypeVersion(props: {
  administrator: AdministratorPayload;
  policyType: string;
  version: string;
  body: ICommunityPlatformPolicyDocument.IUpdate;
}): Promise<ICommunityPlatformPolicyDocument> {
  // Step 1: Fetch the existing document
  const existing =
    await MyGlobal.prisma.community_platform_policy_documents.findUnique({
      where: {
        policy_type_version: {
          policy_type: props.policyType,
          version: props.version,
        },
      },
    });
  if (!existing) {
    throw new HttpException("Policy document not found.", 404);
  }

  // Step 2: Update allowed fields (effective_at, document_uri, description)
  const updated =
    await MyGlobal.prisma.community_platform_policy_documents.update({
      where: {
        policy_type_version: {
          policy_type: props.policyType,
          version: props.version,
        },
      },
      data: {
        effective_at: props.body.effective_at,
        document_uri: props.body.document_uri,
        description: Object.prototype.hasOwnProperty.call(
          props.body,
          "description",
        )
          ? props.body.description
          : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    policy_type: updated.policy_type,
    version: updated.version,
    effective_at: toISOStringSafe(updated.effective_at),
    document_uri: updated.document_uri,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
