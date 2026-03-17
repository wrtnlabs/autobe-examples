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

export async function test_api_profile_file_update_unsupported_profile_media_rejected(
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
  const createdFile =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {},
    );
  typia.assert(createdFile);
  const invalidUpdate = {
    category: "document_attachment",
    original_name: `${RandomGenerator.alphabets(8)}.pdf`,
    extension: "pdf",
    mime_type: "application/pdf",
    size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    url: `https://example.com/${RandomGenerator.alphabets(12)}.pdf`,
  } satisfies ICommunityPlatformProfileFile.IUpdate;
  await TestValidator.error(
    "reject unsupported profile media update",
    async () => {
      await api.functional.communityPlatform.member.profiles.files.update(
        memberConnection,
        {
          fileId: createdFile.id,
          body: invalidUpdate,
        },
      );
    },
  );
  const publicConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.communityPlatform.profiles.at(
    publicConnection,
    {
      profileId: authorized.profile.id,
    },
  );
  typia.assert(profile);
  const preserved = profile.files.find((file) => file.id === createdFile.id);
  TestValidator.predicate(
    "original file remains visible on public profile",
    preserved !== undefined,
  );
  TestValidator.equals(
    "original file url preserved",
    preserved?.url,
    createdFile.url,
  );
  TestValidator.equals(
    "original file category preserved",
    preserved?.category,
    createdFile.category,
  );
  TestValidator.equals(
    "original file original_name preserved",
    preserved?.original_name,
    createdFile.original_name,
  );
  TestValidator.equals(
    "original file extension preserved",
    preserved?.extension,
    createdFile.extension,
  );
  TestValidator.equals(
    "original file mime_type preserved",
    preserved?.mime_type,
    createdFile.mime_type,
  );
  TestValidator.equals(
    "original file size preserved",
    preserved?.size,
    createdFile.size,
  );
  TestValidator.predicate(
    "rejected replacement url not shown publicly",
    profile.files.every((file) => file.url !== invalidUpdate.url),
  );
  TestValidator.predicate(
    "rejected replacement category not shown publicly",
    profile.files.every((file) => file.category !== invalidUpdate.category),
  );
}
