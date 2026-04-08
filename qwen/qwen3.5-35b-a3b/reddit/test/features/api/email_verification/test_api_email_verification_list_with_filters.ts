import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberEmailVerification";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId: string & tags.Format<"uuid"> = memberAuth.id;
  const memberEmail: string & tags.Format<"email"> = memberAuth.email;
  // 2. Test filter by member ID
  const memberFilterResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(memberFilterResponse);
  TestValidator.equals(
    "member filter - all records belong to member",
    memberFilterResponse.data.every(
      (v) => v.reddit_community_member_id === memberId,
    ),
    true,
  );
  TestValidator.equals(
    "member filter - member reference matches",
    memberFilterResponse.data.every(
      (v) =>
        v.member.id === memberId && v.member.username === memberAuth.username,
    ),
    true,
  );
  // 3. Test filter by status = active
  const activeFilterResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          status: "active",
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(activeFilterResponse);
  const now = new Date();
  TestValidator.predicate("active filter - all verifications are active", () =>
    activeFilterResponse.data.every((v) => new Date(v.expires_at) > now),
  );
  // 4. Test filter by status = expired
  const expiredFilterResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          status: "expired",
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiredFilterResponse);
  TestValidator.predicate(
    "expired filter - all verifications are expired",
    () =>
      expiredFilterResponse.data.every((v) => new Date(v.expires_at) <= now),
  );
  // 5. Test filter by created_at date range
  const createdAtStart = new Date(
    new Date().setDate(new Date().getDate() - 1),
  ).toISOString();
  const createdAtEnd = new Date().toISOString();
  const dateRangeFilterResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          created_at_start: createdAtStart,
          created_at_end: createdAtEnd,
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(dateRangeFilterResponse);
  TestValidator.predicate(
    "date range filter - all records within created_at range",
    () =>
      dateRangeFilterResponse.data.every(
        (v) =>
          new Date(v.created_at) >= new Date(createdAtStart) &&
          new Date(v.created_at) <= new Date(createdAtEnd),
      ),
  );
  // 6. Test filter by expires_at date range
  const expiresAtStart = new Date(
    new Date().setDate(new Date().getDate() - 7),
  ).toISOString();
  const expiresAtEnd = new Date(
    new Date().setDate(new Date().getDate() + 30),
  ).toISOString();
  const expiresRangeFilterResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          expires_at_start: expiresAtStart,
          expires_at_end: expiresAtEnd,
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(expiresRangeFilterResponse);
  TestValidator.predicate(
    "expires range filter - all records within expires_at range",
    () =>
      expiresRangeFilterResponse.data.every(
        (v) =>
          new Date(v.expires_at) >= new Date(expiresAtStart) &&
          new Date(v.expires_at) <= new Date(expiresAtEnd),
      ),
  );
  // 7. Test sorting by created_at DESC
  const sortCreatedAtDescResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          sort_by: "created_at",
          sort_order: "desc",
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(sortCreatedAtDescResponse);
  TestValidator.predicate(
    "sort by created_at DESC - records sorted correctly",
    () => {
      if (sortCreatedAtDescResponse.data.length <= 1) return true;
      for (let i = 0; i < sortCreatedAtDescResponse.data.length - 1; i++) {
        if (
          new Date(sortCreatedAtDescResponse.data[i].created_at) <
          new Date(sortCreatedAtDescResponse.data[i + 1].created_at)
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 8. Test sorting by expires_at ASC
  const sortExpiresAtAscResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          sort_by: "expires_at",
          sort_order: "asc",
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(sortExpiresAtAscResponse);
  TestValidator.predicate(
    "sort by expires_at ASC - records sorted correctly",
    () => {
      if (sortExpiresAtAscResponse.data.length <= 1) return true;
      for (let i = 0; i < sortExpiresAtAscResponse.data.length - 1; i++) {
        if (
          new Date(sortExpiresAtAscResponse.data[i].expires_at) >
          new Date(sortExpiresAtAscResponse.data[i + 1].expires_at)
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 9. Test sorting by updated_at ASC
  const sortUpdatedAtAscResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: memberId,
          sort_by: "updated_at",
          sort_order: "asc",
          limit: 100,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(sortUpdatedAtAscResponse);
  TestValidator.predicate(
    "sort by updated_at ASC - records sorted correctly",
    () => {
      if (sortUpdatedAtAscResponse.data.length <= 1) return true;
      for (let i = 0; i < sortUpdatedAtAscResponse.data.length - 1; i++) {
        if (
          new Date(sortUpdatedAtAscResponse.data[i].updated_at) >
          new Date(sortUpdatedAtAscResponse.data[i + 1].updated_at)
        ) {
          return false;
        }
      }
      return true;
    },
  );
  // 10. Test pagination metadata
  TestValidator.equals(
    "pagination - records count matches data length",
    memberFilterResponse.pagination.records,
    memberFilterResponse.data.length,
  );
  TestValidator.equals(
    "pagination - pages calculated correctly",
    memberFilterResponse.pagination.pages,
    Math.ceil(
      memberFilterResponse.pagination.records /
        memberFilterResponse.pagination.limit,
    ),
  );
  // 11. Test with no matching records (empty result)
  const noMatchFilterResponse =
    await api.functional.redditCommunity.member.email_verifications.index(
      memberConnection,
      {
        body: {
          reddit_community_member_id: "00000000-0000-0000-0000-000000000000",
          limit: 10,
        } satisfies IRedditCommunityMemberEmailVerification.IRequest,
      },
    );
  typia.assert(noMatchFilterResponse);
  TestValidator.equals(
    "no match - empty data array",
    noMatchFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no match - pagination records is zero",
    noMatchFilterResponse.pagination.records,
    0,
  );
}
