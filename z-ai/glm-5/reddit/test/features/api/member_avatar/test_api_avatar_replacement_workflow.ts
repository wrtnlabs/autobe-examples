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

export async function test_api_avatar_replacement_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  TestValidator.predicate("member should have karma", joinResult.karma === 0);
  // 2. Upload first avatar image (PNG format, 256x256 pixels)
  const firstAvatarResponse =
    await generate_random_community_platform_member_avatar_create(
      memberConnection,
      {
        body: {
          mimeType: "image/png",
          width: 256,
          height: 256,
        },
      },
    );
  typia.assert(firstAvatarResponse);
  const firstAvatarUrl = firstAvatarResponse.avatarUrl;
  TestValidator.predicate(
    "first avatar URL should exist",
    firstAvatarUrl !== null,
  );
  const initialKarma = firstAvatarResponse.karma;
  // 3. Upload second avatar image (PNG format, 512x512 pixels) to replace the first
  const secondAvatarResponse =
    await generate_random_community_platform_member_avatar_create(
      memberConnection,
      {
        body: {
          mimeType: "image/png",
          width: 512,
          height: 512,
        },
      },
    );
  typia.assert(secondAvatarResponse);
  const secondAvatarUrl = secondAvatarResponse.avatarUrl;
  // 4. Verify the new avatar_url differs from the first
  TestValidator.notEquals(
    "new avatar URL should differ from old avatar URL",
    firstAvatarUrl,
    secondAvatarUrl,
  );
  // 5. Verify member profile shows the new avatar
  TestValidator.predicate(
    "second avatar URL should exist",
    secondAvatarUrl !== null,
  );
  // 6. Verify karma remains unchanged during avatar operations
  TestValidator.equals(
    "karma should remain unchanged after avatar replacement",
    secondAvatarResponse.karma,
    initialKarma,
  );
  // 7. Verify member ID consistency across avatar changes
  TestValidator.equals(
    "member ID should remain consistent",
    firstAvatarResponse.id,
    secondAvatarResponse.id,
  );
}
