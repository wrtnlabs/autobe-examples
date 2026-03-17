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

export async function test_api_profile_browse_public_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnections: api.IConnection[] = ArrayUtil.repeat(4, () => ({
    host: connection.host,
  }));
  const authorizedMembers: ICommunityPlatformMember.IAuthorized[] =
    await ArrayUtil.asyncMap(
      memberConnections,
      async (memberConnection, index) => {
        const join = await authorize_member_join(memberConnection, {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            href: `https://example.com/join/${RandomGenerator.alphabets(8)}-${index}`,
            referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}-${index}`,
            ip: `127.0.0.${index + 1}`,
          },
        });
        return typia.assert<ICommunityPlatformMember.IAuthorized>(join);
      },
    );
  const profileSnapshots: ICommunityPlatformProfile[] = authorizedMembers.map(
    (member) => typia.assert<ICommunityPlatformProfile>(member.profile),
  );
  const searchCandidate: ICommunityPlatformProfile = profileSnapshots[0];
  const rawSearch: string =
    searchCandidate.display_name.length > 0
      ? searchCandidate.display_name
      : (searchCandidate.bio ?? "");
  const guestConnection: api.IConnection = { host: connection.host };
  const limit = 2;
  const page = 1;
  const request = {
    search: rawSearch.length > 0 ? rawSearch : undefined,
    sort: "+display_name",
    page,
    limit,
  } satisfies ICommunityPlatformProfile.IRequest;
  const firstPage = await api.functional.communityPlatform.profiles.index(
    guestConnection,
    {
      body: request,
    },
  );
  const secondPage = await api.functional.communityPlatform.profiles.index(
    guestConnection,
    {
      body: request,
    },
  );
  const first =
    typia.assert<IPageICommunityPlatformProfile.ISummary>(firstPage);
  const second =
    typia.assert<IPageICommunityPlatformProfile.ISummary>(secondPage);
  TestValidator.equals(
    "pagination current page matches request",
    first.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    first.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records cover returned data length",
    first.pagination.records >= first.data.length,
  );
  TestValidator.predicate(
    "pagination pages are non negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    first.data.length <= limit,
  );
  TestValidator.equals(
    "repeated call current page is deterministic",
    second.pagination.current,
    first.pagination.current,
  );
  TestValidator.equals(
    "repeated call limit is deterministic",
    second.pagination.limit,
    first.pagination.limit,
  );
  TestValidator.equals(
    "repeated call record count is deterministic",
    second.pagination.records,
    first.pagination.records,
  );
  TestValidator.equals(
    "repeated call page count is deterministic",
    second.pagination.pages,
    first.pagination.pages,
  );
  TestValidator.equals(
    "repeated call data length is deterministic",
    second.data.length,
    first.data.length,
  );
  TestValidator.equals(
    "repeated call data ordering is deterministic",
    second.data,
    first.data,
  );
  TestValidator.equals(
    "repeated call data serialization is deterministic",
    JSON.stringify(second.data),
    JSON.stringify(first.data),
  );
  TestValidator.equals(
    "profile snapshots remain unchanged after browse",
    profileSnapshots,
    authorizedMembers.map((member) => member.profile),
  );
}
