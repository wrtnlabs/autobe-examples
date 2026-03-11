import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_attachment_category_ordering_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Test valid reorganization request with search and pagination
  const validRequest: IDiscussionBoardAttachmentCategory.IRequest = {
    search: RandomGenerator.paragraph({ sentences: 1 }),
    parent_id: null,
    is_active: true,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const response =
    await api.functional.discussionBoard.member.organize.attachments.index(
      memberConnection,
      {
        body: validRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // Test pagination with different parameters
  const paginationRequest: IDiscussionBoardAttachmentCategory.IRequest = {
    page: 1,
    limit: 5,
  };
  const paginationResponse =
    await api.functional.discussionBoard.member.organize.attachments.index(
      memberConnection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(paginationResponse);
  // Test search functionality
  const searchRequest: IDiscussionBoardAttachmentCategory.IRequest = {
    search: "test",
    page: 1,
    limit: 10,
  };
  const searchResponse =
    await api.functional.discussionBoard.member.organize.attachments.index(
      memberConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResponse);
}
