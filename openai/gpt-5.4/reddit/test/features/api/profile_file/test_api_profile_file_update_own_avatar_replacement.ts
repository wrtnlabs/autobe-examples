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

export async function test_api_profile_file_update_own_avatar_replacement(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const created =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body: {
          category: "avatar",
          original_name: `${RandomGenerator.alphabets(8)}.png`,
          extension: "png",
          mime_type: "image/png",
          size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          url: `https://storage.example.com/profile/${RandomGenerator.alphaNumeric(16)}.png`,
        } satisfies ICommunityPlatformProfileFile.ICreate,
      },
    );
  typia.assert(created);
  const updateBody = {
    category: "avatar",
    original_name: `${RandomGenerator.alphabets(10)}.jpg`,
    extension: "jpg",
    mime_type: "image/jpeg",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    url: `https://cdn.example.com/avatar/${RandomGenerator.alphaNumeric(20)}.jpg`,
  } satisfies ICommunityPlatformProfileFile.IUpdate;
  const updated =
    await api.functional.communityPlatform.member.profiles.files.update(
      memberConnection,
      {
        fileId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("file id is preserved", updated.id, created.id);
  TestValidator.equals(
    "profile ownership summary preserved",
    updated.profile,
    created.profile,
  );
  TestValidator.equals(
    "category updated",
    updated.category,
    updateBody.category,
  );
  TestValidator.equals(
    "original name updated",
    updated.original_name,
    updateBody.original_name,
  );
  TestValidator.equals(
    "extension updated",
    updated.extension,
    updateBody.extension,
  );
  TestValidator.equals(
    "mime type updated",
    updated.mime_type,
    updateBody.mime_type,
  );
  TestValidator.equals("size updated", updated.size, updateBody.size);
  TestValidator.equals("url updated", updated.url, updateBody.url);
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    created.updated_at,
  );
  TestValidator.equals("deleted_at remains active", updated.deleted_at, null);
  const publicConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.communityPlatform.profiles.at(
    publicConnection,
    {
      profileId: authorized.profile.id,
    },
  );
  typia.assert(profile);
  const reflected = profile.files.find((file) => file.id === updated.id);
  const reflectedFile = typia.assert(reflected!);
  TestValidator.equals(
    "public profile reflects same file identity",
    reflectedFile.id,
    updated.id,
  );
  TestValidator.equals(
    "public profile reflects updated file category",
    reflectedFile.category,
    updateBody.category,
  );
  TestValidator.equals(
    "public profile reflects updated original name",
    reflectedFile.original_name,
    updateBody.original_name,
  );
  TestValidator.equals(
    "public profile reflects updated extension",
    reflectedFile.extension,
    updateBody.extension,
  );
  TestValidator.equals(
    "public profile reflects updated mime type",
    reflectedFile.mime_type,
    updateBody.mime_type,
  );
  TestValidator.equals(
    "public profile reflects updated size",
    reflectedFile.size,
    updateBody.size,
  );
  TestValidator.equals(
    "public profile reflects updated url",
    reflectedFile.url,
    updateBody.url,
  );
  TestValidator.equals(
    "public profile file remains active",
    reflectedFile.deleted_at,
    null,
  );
}
