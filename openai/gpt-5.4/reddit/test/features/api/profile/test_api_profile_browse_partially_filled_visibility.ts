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
import type { IPageICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_browse_partially_filled_visibility(
  connection: api.IConnection,
): Promise<void> {
  const memberDisplayNameConnection: api.IConnection = {
    host: connection.host,
  };
  const memberDisplayNameAuth = await authorize_member_join(
    memberDisplayNameConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(memberDisplayNameAuth);
  const displayNameOnly = RandomGenerator.name();
  const displayNameProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberDisplayNameConnection,
      {
        body: {
          display_name: displayNameOnly,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(displayNameProfile);
  TestValidator.equals(
    "display-name-only profile stores display name",
    displayNameProfile.display_name,
    displayNameOnly,
  );
  const memberBioConnection: api.IConnection = {
    host: connection.host,
  };
  const memberBioAuth = await authorize_member_join(memberBioConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBioAuth);
  const bioOnly = RandomGenerator.paragraph({ sentences: 3 });
  const bioProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberBioConnection,
      {
        body: {
          bio: bioOnly,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(bioProfile);
  TestValidator.equals("bio-only profile stores bio", bioProfile.bio, bioOnly);
  const memberAvatarConnection: api.IConnection = {
    host: connection.host,
  };
  const memberAvatarAuth = await authorize_member_join(memberAvatarConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAvatarAuth);
  const avatarExtension = "png";
  const avatarMimeType =
    {
      png: "image/png",
    }[avatarExtension] ?? "application/octet-stream";
  const avatarUrl = `https://example.com/${RandomGenerator.alphaNumeric(12)}.${avatarExtension}`;
  const avatarProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberAvatarConnection,
      {
        body: {
          avatar: {
            category: "avatar",
            original_name: `avatar-${RandomGenerator.alphaNumeric(8)}.${avatarExtension}`,
            extension: avatarExtension,
            mime_type: avatarMimeType,
            size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
            url: avatarUrl,
          } satisfies ICommunityPlatformProfileFile.IUpdate,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(avatarProfile);
  TestValidator.predicate(
    "avatar-only profile exposes at least one file",
    avatarProfile.files.length > 0,
  );
  TestValidator.predicate(
    "avatar-only profile contains avatar metadata",
    ArrayUtil.has(avatarProfile.files, (file) => file.url === avatarUrl),
  );
  const browseConnection: api.IConnection = {
    host: connection.host,
  };
  const page = await api.functional.communityPlatform.profiles.index(
    browseConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformProfile.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "browse response current page is first page",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "browse response limit matches request",
    page.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "partially filled profiles remain browseable in collection",
    page.pagination.records >= 3,
  );
  TestValidator.predicate(
    "browse response returns paginated data without omission failure",
    page.data.length >= 3,
  );
}
