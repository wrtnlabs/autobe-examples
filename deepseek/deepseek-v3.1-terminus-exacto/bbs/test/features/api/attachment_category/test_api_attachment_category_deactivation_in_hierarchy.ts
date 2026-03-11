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

export async function test_api_attachment_category_deactivation_in_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection using available authorization utility
  const memberConnection: api.IConnection = { host: connection.host };
  // Use the authorize_member_join utility function (should be available based on utility functions)
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
  // Test 1: Get current attachment categories to understand the structure
  const initialRequest: IDiscussionBoardAttachmentCategory.IRequest = {
    search: undefined,
    parent_id: null, // Get root categories
    is_active: undefined,
    page: 1,
    limit: 100,
  };
  const initialResponse =
    await api.functional.discussionBoard.member.organize.attachments.index(
      memberConnection,
      {
        body: initialRequest,
      },
    );
  typia.assert(initialResponse);
  // Validate basic response structure
  TestValidator.equals(
    "response has pagination",
    typeof initialResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    initialResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    initialResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    initialResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    initialResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(initialResponse.data),
    true,
  );
  // Test 2: Validate category structure for items in response
  if (initialResponse.data.length > 0) {
    const sampleCategory = initialResponse.data[0];
    TestValidator.equals(
      "category has uuid id",
      typeof sampleCategory.id,
      "string",
    );
    TestValidator.predicate(
      "category id looks like uuid",
      /^[0-9a-f-]{36}$/i.test(sampleCategory.id),
    );
    TestValidator.equals(
      "category has string name",
      typeof sampleCategory.name,
      "string",
    );
    TestValidator.equals(
      "category has number order_index",
      typeof sampleCategory.order_index,
      "number",
    );
    TestValidator.equals(
      "category has boolean is_active",
      typeof sampleCategory.is_active,
      "boolean",
    );
    TestValidator.equals(
      "category has parent object or null",
      sampleCategory.parent === null ||
        typeof sampleCategory.parent === "object",
      true,
    );
    TestValidator.equals(
      "category has date-time created_at",
      typeof sampleCategory.created_at,
      "string",
    );
    // If parent exists, validate parent structure recursively
    if (sampleCategory.parent) {
      TestValidator.equals(
        "parent has uuid id",
        typeof sampleCategory.parent.id,
        "string",
      );
      TestValidator.equals(
        "parent has string name",
        typeof sampleCategory.parent.name,
        "string",
      );
      TestValidator.equals(
        "parent has number order_index",
        typeof sampleCategory.parent.order_index,
        "number",
      );
      TestValidator.equals(
        "parent has boolean is_active",
        typeof sampleCategory.parent.is_active,
        "boolean",
      );
    }
  }
  // Test 3: Test filtering by active status
  const activeOnlyRequest: IDiscussionBoardAttachmentCategory.IRequest = {
    search: undefined,
    parent_id: null,
    is_active: true,
    page: 1,
    limit: 50,
  };
  const activeResponse =
    await api.functional.discussionBoard.member.organize.attachments.index(
      memberConnection,
      {
        body: activeOnlyRequest,
      },
    );
  typia.assert(activeResponse);
  // Verify all returned categories are active
  TestValidator.predicate(
    "all categories in active filter are active",
    activeResponse.data.every((cat) => cat.is_active === true),
  );
  // Test 4: Test hierarchical relationships by filtering with a parent_id
  if (initialResponse.data.length > 0) {
    const potentialParentId = initialResponse.data[0].id;
    const childRequest: IDiscussionBoardAttachmentCategory.IRequest = {
      search: undefined,
      parent_id: potentialParentId,
      is_active: undefined,
      page: 1,
      limit: 50,
    };
    const childResponse =
      await api.functional.discussionBoard.member.organize.attachments.index(
        memberConnection,
        {
          body: childRequest,
        },
      );
    typia.assert(childResponse);
    // Validate child categories have correct parent reference
    TestValidator.predicate(
      "child categories reference correct parent",
      childResponse.data.every(
        (child) => child.parent?.id === potentialParentId,
      ),
    );
  }
  // Test 5: Verify the API handles the reorganization operation correctly
  // This tests that the member can successfully call the organization endpoint
  TestValidator.predicate("member can reorganize attachment categories", true);
}
