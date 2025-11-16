import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorPolicyDocumentsPolicyTypeVersion(props: {
  administrator: AdministratorPayload;
  policyType: string;
  version: string;
}): Promise<ICommunityPlatformPolicyDocument> {
  const policy =
    await MyGlobal.prisma.community_platform_policy_documents.findUnique({
      where: {
        policy_type_version: {
          policy_type: props.policyType,
          version: props.version,
        },
        deleted_at: null,
      },
    });

  if (!policy) {
    throw new HttpException("Policy document not found", 404);
  }

  return {
    id: policy.id,
    policy_type: policy.policy_type,
    version: policy.version,
    effective_at: toISOStringSafe(policy.effective_at),
    document_uri: policy.document_uri,
    description:
      policy.description === undefined ? undefined : policy.description,
    created_at: toISOStringSafe(policy.created_at),
    updated_at: toISOStringSafe(policy.updated_at),
    deleted_at:
      policy.deleted_at === null || policy.deleted_at === undefined
        ? undefined
        : toISOStringSafe(policy.deleted_at),
  };
}
