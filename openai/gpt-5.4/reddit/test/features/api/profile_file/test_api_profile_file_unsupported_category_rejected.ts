import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_profiles_files_create } from "../../../generate/generate_random_community_platform_member_profiles_files_create";
import { prepare_random_community_platform_profile_file } from "../../../prepare/prepare_random_community_platform_profile_file";

export async function test_api_profile_file_unsupported_category_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member, then verify profile file creation rejects
  // an unsupported non-avatar category through the profile media endpoint.
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const unsupportedCategory = `post_${RandomGenerator.alphabets(8)}`;
  TestValidator.predicate(
    "joined profile has no unsupported category file before attempt",
    !ArrayUtil.has(
      authorized.profile.files,
      (file) => file.category === unsupportedCategory,
    ),
  );
  const extension = "png";
  const body = {
    category: unsupportedCategory,
    original_name: `${RandomGenerator.alphabets(10)}.${extension}`,
    extension,
    mime_type: "image/png",
    size: 1024,
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformProfileFile.ICreate;
  await TestValidator.error(
    "profile file creation rejects unsupported category",
    async () => {
      await generate_random_community_platform_member_profiles_files_create(
        memberConnection,
        {
          body,
        },
      );
    },
  );
}
