import { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityApiKeyCollector } from "../collectors/CommunityApiKeyCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityApiKeyTransformer } from "../transformers/CommunityApiKeyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminApiKeys(props: {
  admin: AdminPayload;
  body: ICommunityApiKey.ICreate;
}): Promise<ICommunityApiKey> {
  const key: string = v4();
  const now: Date = new Date();
  const maxExpiration: Date = new Date(
    now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000,
  );
  const defaultExpiration: Date = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  );
  const expiration: Date = defaultExpiration;
  if (expiration < now) {
    throw new HttpException("Expiration date cannot be in the past", 400);
  }
  if (expiration > maxExpiration) {
    throw new HttpException(
      "Expiration date cannot exceed 2 years from now",
      400,
    );
  }
  const expiredAt: string & tags.Format<"date-time"> =
    toISOStringSafe(expiration);
  const created = await MyGlobal.prisma.community_api_keys.create({
    data: await CommunityApiKeyCollector.collect({
      body: props.body,
      communityMembers: props.admin,
      communityAdmins: props.admin,
      communityModerators: props.admin,
      communityMemberSessions: props.admin,
      communityAdminSessions: props.admin,
      communityModeratorSessions: props.admin,
    }),
    ...CommunityApiKeyTransformer.select(),
  });
  return await CommunityApiKeyTransformer.transform(created);
}
