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

export async function postCommunityPlatformAdministratorPolicyDocuments(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformPolicyDocument.ICreate;
}): Promise<ICommunityPlatformPolicyDocument> {
  // Check for unique (policy_type, version) constraint (not soft-deleted)
  const alreadyExists =
    await MyGlobal.prisma.community_platform_policy_documents.findFirst({
      where: {
        policy_type: props.body.policy_type,
        version: props.body.version,
        deleted_at: null,
      },
    });
  if (alreadyExists) {
    throw new HttpException(
      "Policy document with this policy_type and version already exists.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_policy_documents.create({
      data: {
        id: v4(),
        policy_type: props.body.policy_type,
        version: props.body.version,
        effective_at: props.body.effective_at,
        document_uri: props.body.document_uri,
        description:
          props.body.description === undefined ? null : props.body.description,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  const result: ICommunityPlatformPolicyDocument = {
    id: created.id,
    policy_type: created.policy_type,
    version: created.version,
    effective_at: toISOStringSafe(created.effective_at),
    document_uri: created.document_uri,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
  return result;
}
