import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_listing_filter_by_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple active member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member3);
  // Test filtering by ban_status='active' - should return all created members
  const activeMembers = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        ban_status: "active",
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeMembers);
  // Verify active filter returns our created members
  TestValidator.equals(
    "active filter returns members",
    activeMembers.data.some((m) => m.id === member1.id),
    true,
  );
  TestValidator.equals(
    "active filter returns member2",
    activeMembers.data.some((m) => m.id === member2.id),
    true,
  );
  TestValidator.equals(
    "active filter returns member3",
    activeMembers.data.some((m) => m.id === member3.id),
    true,
  );
  // Test filtering by ban_status='banned' - should return no members
  // (since we cannot create banned members without admin API)
  const bannedMembers = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        ban_status: "banned",
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(bannedMembers);
  // Verify banned filter returns empty or no matching members
  TestValidator.predicate(
    "banned filter returns no active members",
    !bannedMembers.data.some(
      (m) => m.id === member1.id || m.id === member2.id || m.id === member3.id,
    ),
  );
}
