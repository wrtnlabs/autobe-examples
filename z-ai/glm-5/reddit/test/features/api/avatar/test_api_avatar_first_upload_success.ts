import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_avatar_create } from "../../../generate/generate_random_community_platform_member_avatar_create";
import { prepare_random_community_platform_avatar_file } from "../../../prepare/prepare_random_community_platform_avatar_file";

export async function test_api_avatar_first_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      href: "https://example.com/register",
      referrer: "https://example.com/",
    },
  });
  typia.assert(authorizedMember);
  // Verify member initially has no avatar
  TestValidator.equals(
    "initial avatar is null",
    authorizedMember.avatarUrl,
    null,
  );
  // Step 2: Upload avatar image
  // Create a valid JPEG avatar upload request
  const avatarData = typia.random<ICommunityPlatformAvatarFile.ICreate>();
  const updatedMember =
    await api.functional.communityPlatform.member.avatar.create(
      memberConnection,
      {
        body: avatarData satisfies ICommunityPlatformAvatarFile.ICreate,
      },
    );
  typia.assert(updatedMember);
  // Step 3: Verify avatar was uploaded successfully
  TestValidator.predicate(
    "avatar URL is not null after upload",
    updatedMember.avatarUrl !== null,
  );
  TestValidator.equals(
    "member ID matches",
    updatedMember.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "username matches",
    updatedMember.username,
    authorizedMember.username,
  );
}
