import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformChannel";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_channel_list_public_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate member using utility function
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Request channels with active status and page size of 25
  const response: IPageICommunityPlatformChannel.ISummary =
    await api.functional.communityPlatform.member.channels.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 25,
          status: "active",
        } satisfies ICommunityPlatformChannel.IRequest,
      },
    );
  // Step 3: Validate the response structure with typia.assert (MUST be first)
  typia.assert(response);
  // Step 4: Validate pagination structure with correct relationship
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records > 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    response.pagination.pages > 0,
  );
  // Validate pagination relationship: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // Step 5: Validate that response contains at least one active channel
  TestValidator.predicate(
    "at least one channel exists",
    response.data.length > 0,
  );
  // Step 6: Validate the first channel has all required properties and populated section
  const firstChannel = response.data[0];
  // Validate channel properties
  TestValidator.equals(
    "first channel has id format",
    typeof firstChannel.id,
    "string",
  );
  TestValidator.equals(
    "first channel has name",
    typeof firstChannel.name,
    "string",
  );
  TestValidator.equals(
    "first channel has status",
    firstChannel.status,
    "active",
  );
  TestValidator.predicate(
    "first channel has member count",
    firstChannel.member_count >= 0,
  );
  TestValidator.equals(
    "first channel has created at",
    typeof firstChannel.created_at,
    "string",
  );
  TestValidator.equals(
    "first channel has is featured",
    typeof firstChannel.is_featured,
    "boolean",
  );
  // Validate section properties
  TestValidator.equals(
    "first channel section has id",
    typeof firstChannel.section.id,
    "string",
  );
  TestValidator.equals(
    "first channel section has name",
    typeof firstChannel.section.name,
    "string",
  );
  TestValidator.equals(
    "first channel section has status",
    firstChannel.section.status,
    "active",
  );
  TestValidator.equals(
    "first channel section has created at",
    typeof firstChannel.section.created_at,
    "string",
  );
  // Verify that the section's status is one of the allowed values
  TestValidator.predicate(
    "first channel section status is valid",
    ["active", "inactive", "archived"].includes(firstChannel.section.status),
  );
  // Step 7: Verify that all channels in response have active status as specified
  response.data.forEach((channel) => {
    TestValidator.equals("channel status is active", channel.status, "active");
  });
}
