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

export async function test_api_profile_file_avatar_replacement_on_owned_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: `https://example.com/join/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const firstBody = {
    category: "avatar",
    original_name: `avatar-${RandomGenerator.alphabets(8)}.png`,
    extension: "png",
    mime_type: "image/png",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    url: `https://example.com/uploads/avatar-${RandomGenerator.alphabets(8)}.png`,
  } satisfies ICommunityPlatformProfileFile.ICreate;
  const firstFile =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body: firstBody,
      },
    );
  typia.assert(firstFile);
  const secondBody = {
    category: "avatar",
    original_name: `avatar-${RandomGenerator.alphabets(8)}.jpg`,
    extension: "jpg",
    mime_type: "image/jpeg",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    url: `https://example.com/uploads/avatar-${RandomGenerator.alphabets(8)}.jpg`,
  } satisfies ICommunityPlatformProfileFile.ICreate;
  const secondFile =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body: secondBody,
      },
    );
  typia.assert(secondFile);
  TestValidator.equals(
    "first file category matches request",
    firstFile.category,
    firstBody.category,
  );
  TestValidator.equals(
    "first file original name matches request",
    firstFile.original_name,
    firstBody.original_name,
  );
  TestValidator.equals(
    "first file extension matches request",
    firstFile.extension,
    firstBody.extension,
  );
  TestValidator.equals(
    "first file mime type matches request",
    firstFile.mime_type,
    firstBody.mime_type,
  );
  TestValidator.equals(
    "first file size matches request",
    firstFile.size,
    firstBody.size,
  );
  TestValidator.equals(
    "first file url matches request",
    firstFile.url,
    firstBody.url,
  );
  TestValidator.equals(
    "first file is active after creation",
    firstFile.deleted_at,
    null,
  );
  TestValidator.equals(
    "second file category matches request",
    secondFile.category,
    secondBody.category,
  );
  TestValidator.equals(
    "second file original name matches request",
    secondFile.original_name,
    secondBody.original_name,
  );
  TestValidator.equals(
    "second file extension matches request",
    secondFile.extension,
    secondBody.extension,
  );
  TestValidator.equals(
    "second file mime type matches request",
    secondFile.mime_type,
    secondBody.mime_type,
  );
  TestValidator.equals(
    "second file size matches request",
    secondFile.size,
    secondBody.size,
  );
  TestValidator.equals(
    "second file url matches request",
    secondFile.url,
    secondBody.url,
  );
  TestValidator.equals(
    "second replacement file is active after creation",
    secondFile.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "replacement creates a new profile file id",
    firstFile.id,
    secondFile.id,
  );
  TestValidator.notEquals(
    "replacement uses a different original name",
    firstFile.original_name,
    secondFile.original_name,
  );
  TestValidator.notEquals(
    "replacement uses a different url",
    firstFile.url,
    secondFile.url,
  );
  TestValidator.equals(
    "replacement stays on the same implicit owned profile",
    firstFile.profile,
    secondFile.profile,
  );
}
