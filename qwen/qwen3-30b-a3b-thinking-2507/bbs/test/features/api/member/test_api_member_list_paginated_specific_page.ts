import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_list_paginated_specific_page(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (using utility function)
  const member = await authorize_member_join(connection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    },
  });
  typia.assert(member);
  // Step 2: Create new connection for authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  // Step 3: Request specific page and limit
  const page = 1;
  const limit = 10;
  const response = await api.functional.discussionBoard.member.members.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(response);
  // Step 4: Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, page);
  TestValidator.equals("limit", response.pagination.limit, limit);
  TestValidator.equals(
    "total records matches data count",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "total pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / limit),
  );
}
