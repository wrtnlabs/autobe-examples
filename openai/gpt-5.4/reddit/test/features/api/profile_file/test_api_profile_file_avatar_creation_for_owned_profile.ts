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

export async function test_api_profile_file_avatar_creation_for_owned_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const extension = "png";
  const mimeType = "image/png";
  const body = {
    category: "avatar",
    original_name: `avatar-${RandomGenerator.alphabets(8)}.${extension}`,
    extension,
    mime_type: mimeType,
    size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    url: `https://storage.example.com/profile-media/${RandomGenerator.alphaNumeric(16)}.${extension}`,
  } satisfies ICommunityPlatformProfileFile.ICreate;
  const created =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "authorized profile is active",
    authorized.profile.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "created file id differs from owned profile id",
    created.id,
    authorized.profile.id,
  );
  TestValidator.equals("category matches", created.category, body.category);
  TestValidator.equals(
    "original filename matches",
    created.original_name,
    body.original_name,
  );
  TestValidator.equals("extension matches", created.extension, body.extension);
  TestValidator.equals("mime type matches", created.mime_type, body.mime_type);
  TestValidator.equals("size matches", created.size, body.size);
  TestValidator.equals("url matches", created.url, body.url);
  TestValidator.equals("file remains active", created.deleted_at, null);
  TestValidator.equals(
    "returned profile summary resolves to owning profile summary",
    created.profile,
    authorized.profile.member,
  );
}
