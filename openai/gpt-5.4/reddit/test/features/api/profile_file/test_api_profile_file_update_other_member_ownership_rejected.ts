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

export async function test_api_profile_file_update_other_member_ownership_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuthorized);
  const protectedFile =
    await generate_random_community_platform_member_profiles_files_create(
      ownerConnection,
      {
        body: {
          category: "avatar",
          original_name: `owner-${RandomGenerator.alphaNumeric(8)}.png`,
          extension: "png",
          mime_type: "image/png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1048576>
          >(),
          url: `https://example.com/profile/${RandomGenerator.alphaNumeric(16)}.png`,
        },
      },
    );
  typia.assert(protectedFile);
  const before =
    await api.functional.communityPlatform.member.profiles.files.at(
      ownerConnection,
      {
        fileId: protectedFile.id,
      },
    );
  typia.assert(before);
  const attackerConnection: api.IConnection = { host: connection.host };
  const attackerAuthorized = await authorize_member_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(attackerAuthorized);
  const attackBody = {
    category: "avatar",
    original_name: `attacker-${RandomGenerator.alphaNumeric(8)}.jpg`,
    extension: "jpg",
    mime_type: "image/jpeg",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1048576>
    >(),
    url: `https://example.com/profile/${RandomGenerator.alphaNumeric(16)}.jpg`,
  } satisfies ICommunityPlatformProfileFile.IUpdate;
  await TestValidator.httpError(
    "other member cannot update owner profile file",
    403,
    async () => {
      await api.functional.communityPlatform.member.profiles.files.update(
        attackerConnection,
        {
          fileId: protectedFile.id,
          body: attackBody,
        },
      );
    },
  );
  const after = await api.functional.communityPlatform.member.profiles.files.at(
    attackerConnection,
    {
      fileId: protectedFile.id,
    },
  );
  typia.assert(after);
  TestValidator.equals("file id unchanged", after.id, before.id);
  TestValidator.equals(
    "file category unchanged",
    after.category,
    before.category,
  );
  TestValidator.equals(
    "file original_name unchanged",
    after.original_name,
    before.original_name,
  );
  TestValidator.equals(
    "file extension unchanged",
    after.extension,
    before.extension,
  );
  TestValidator.equals(
    "file mime_type unchanged",
    after.mime_type,
    before.mime_type,
  );
  TestValidator.equals("file size unchanged", after.size, before.size);
  TestValidator.equals("file url unchanged", after.url, before.url);
  TestValidator.equals(
    "file created_at unchanged",
    after.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "file updated_at unchanged after forbidden update",
    after.updated_at,
    before.updated_at,
  );
  TestValidator.equals(
    "file deleted_at unchanged",
    after.deleted_at,
    before.deleted_at,
  );
  TestValidator.equals(
    "public profile linkage unchanged",
    after.profile,
    before.profile,
  );
}
