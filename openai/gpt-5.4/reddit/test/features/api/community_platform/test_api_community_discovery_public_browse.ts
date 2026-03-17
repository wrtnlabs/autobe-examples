import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_public_browse(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const page = 1 satisfies number as number;
  const limit = 10 satisfies number as number;
  const request = {
    page,
    limit,
  } satisfies ICommunityPlatformCommunity.IRequest;
  const response = await api.functional.communityPlatform.communities.index(
    guestConnection,
    {
      body: request,
    },
  );
  const output =
    typia.assert<IPageICommunityPlatformCommunity.ISummary>(response);
  TestValidator.equals(
    "pagination current matches requested page",
    output.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    output.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages matches ceiling formula",
    output.pagination.pages,
    Math.ceil(output.pagination.records / output.pagination.limit),
  );
  if (output.pagination.records === 0) {
    TestValidator.equals(
      "empty result has zero pages",
      output.pagination.pages,
      0,
    );
    TestValidator.equals("empty result has no data", output.data.length, 0);
  } else {
    TestValidator.predicate(
      "non-empty result has at least one page",
      output.pagination.pages >= 1,
    );
    if (output.pagination.pages > 0) {
      TestValidator.predicate(
        "current page is within page count",
        output.pagination.current <= output.pagination.pages,
      );
    }
  }
  for (const community of output.data) {
    typia.assert<ICommunityPlatformCommunity.ISummary>(community);
    typia.assert<ICommunityPlatformMember.ISummary>(community.member);
    TestValidator.predicate(
      "community slug is non-empty",
      community.slug.length > 0,
    );
    TestValidator.predicate(
      "community title is non-empty",
      community.title.length > 0,
    );
    TestValidator.predicate(
      "community description is non-empty",
      community.description.length > 0,
    );
    TestValidator.predicate(
      "community status is non-empty",
      community.status.length > 0,
    );
    TestValidator.predicate(
      "subscriber count is non-negative",
      community.subscriber_count >= 0,
    );
    TestValidator.equals(
      "community deleted_at is null for discoverable browse results",
      community.deleted_at,
      null,
    );
    TestValidator.predicate(
      "owner member code is non-empty",
      community.member.code.length > 0,
    );
    TestValidator.predicate(
      "owner member status is non-empty",
      community.member.status.length > 0,
    );
  }
  if (output.pagination.current < output.pagination.pages) {
    const nextPage = (output.pagination.current + 1) satisfies number as number;
    const nextRequest = {
      page: nextPage,
      limit,
    } satisfies ICommunityPlatformCommunity.IRequest;
    const nextResponse =
      await api.functional.communityPlatform.communities.index(
        guestConnection,
        {
          body: nextRequest,
        },
      );
    const nextOutput =
      typia.assert<IPageICommunityPlatformCommunity.ISummary>(nextResponse);
    TestValidator.equals(
      "next page current matches request",
      nextOutput.pagination.current,
      nextPage,
    );
    TestValidator.equals(
      "next page limit matches request",
      nextOutput.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "next page records matches first page records",
      nextOutput.pagination.records,
      output.pagination.records,
    );
    TestValidator.equals(
      "next page pages matches first page pages",
      nextOutput.pagination.pages,
      output.pagination.pages,
    );
    TestValidator.equals(
      "next page pages matches ceiling formula",
      nextOutput.pagination.pages,
      Math.ceil(nextOutput.pagination.records / nextOutput.pagination.limit),
    );
    TestValidator.predicate(
      "next page data length does not exceed limit",
      nextOutput.data.length <= nextOutput.pagination.limit,
    );
    const firstPageIds = new Set(output.data.map((community) => community.id));
    for (const community of nextOutput.data) {
      typia.assert<ICommunityPlatformCommunity.ISummary>(community);
      TestValidator.predicate(
        "next page community does not overlap first page",
        firstPageIds.has(community.id) === false,
      );
    }
  }
}
