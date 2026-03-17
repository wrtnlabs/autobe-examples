import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileFile";
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

export async function test_api_profile_file_list_profile_ownership_boundary(
  connection: api.IConnection,
): Promise<void> {
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "authorization required for profile file listing",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.profiles.files.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 100,
          } satisfies ICommunityPlatformProfileFile.IRequest,
        },
      );
    },
  );
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  const memberAFile =
    await generate_random_community_platform_member_profiles_files_create(
      memberAConnection,
      {
        body: {
          category: "avatar",
          original_name: `${RandomGenerator.alphabets(8)}.png`,
          extension: "png",
          mime_type: "image/png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5000000>
          >(),
          url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(memberAFile);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  const page =
    await api.functional.communityPlatform.member.profiles.files.index(
      memberBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformProfileFile.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "member B should see no profile files when owning none",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "member B returned data length should be zero",
    page.data.length,
    0,
  );
  TestValidator.predicate(
    "member A file must not be exposed to member B",
    page.data.every((file) => file.id !== memberAFile.id),
  );
}
