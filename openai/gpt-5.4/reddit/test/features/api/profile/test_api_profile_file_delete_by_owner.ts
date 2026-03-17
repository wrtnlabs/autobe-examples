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

export async function test_api_profile_file_delete_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(authorized);
  const created: ICommunityPlatformProfileFile =
    await generate_random_community_platform_member_profiles_files_create(
      memberConnection,
      {
        body: {
          category: "avatar",
          original_name: `${RandomGenerator.alphabets(8)}.png`,
          extension: "png",
          mime_type: "image/png",
          size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformProfileFile.ICreate,
      },
    );
  typia.assert(created);
  const found: ICommunityPlatformProfileFile =
    await api.functional.communityPlatform.member.profiles.files.at(
      memberConnection,
      {
        fileId: created.id,
      },
    );
  typia.assert(found);
  TestValidator.equals(
    "created file id matches fetched file id",
    found.id,
    created.id,
  );
  TestValidator.equals(
    "created file category matches fetched file category",
    found.category,
    created.category,
  );
  TestValidator.equals(
    "created file original name matches fetched file original name",
    found.original_name,
    created.original_name,
  );
  TestValidator.equals(
    "created file URL matches fetched file URL",
    found.url,
    created.url,
  );
  TestValidator.equals(
    "active file is not deleted before erase",
    found.deleted_at,
    null,
  );
  await api.functional.communityPlatform.member.profiles.files.erase(
    memberConnection,
    {
      fileId: created.id,
    },
  );
  await TestValidator.error(
    "deleted profile file is no longer available",
    async () => {
      await api.functional.communityPlatform.member.profiles.files.at(
        memberConnection,
        {
          fileId: created.id,
        },
      );
    },
  );
}
