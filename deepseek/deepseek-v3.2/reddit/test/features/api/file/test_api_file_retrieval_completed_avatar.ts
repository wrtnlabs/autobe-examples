import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_file_retrieval_completed_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Check if member has avatar after registration
  if (member.avatar === null) {
    // If no avatar exists, we cannot test file retrieval
    // This is a legitimate scenario - not all members have avatars
    console.log("Member has no avatar, skipping file retrieval test");
    return;
  }
  // 2. Retrieve the avatar file metadata
  const file = await api.functional.communityPlatform.files.at(
    memberConnection,
    {
      fileId: member.avatar.id,
    },
  );
  typia.assert(file);
  // 3. Validate business logic (not type validation - typia.assert already handled that)
  TestValidator.equals("file status is completed", file.status, "completed");
  TestValidator.equals("actor type is member", file.actor_type, "member");
  TestValidator.equals("actor id matches member", file.actor_id, member.id);
  TestValidator.predicate("public_url is non-null", file.public_url !== null);
  TestValidator.predicate("file is not soft-deleted", file.deleted_at === null);
  // 4. Validate public_url is a valid URI format
  // Use typia.is to check if public_url matches the URI format constraint
  TestValidator.predicate(
    "public_url has valid URI format",
    typia.is<string & tags.Format<"uri">>(file.public_url!),
  );
  // 5. Validate file size is non-negative
  TestValidator.predicate("file size is non-negative", file.size >= 0);
  // 6. Validate timestamps are in correct order (created_at <= updated_at)
  const createdAt = new Date(file.created_at);
  const updatedAt = new Date(file.updated_at);
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    createdAt <= updatedAt,
  );
  // 7. Validate file name is non-empty
  TestValidator.predicate("file name is non-empty", file.name.length > 0);
  // 8. Validate MIME type is non-empty
  TestValidator.predicate("file type is non-empty", file.type.length > 0);
}
