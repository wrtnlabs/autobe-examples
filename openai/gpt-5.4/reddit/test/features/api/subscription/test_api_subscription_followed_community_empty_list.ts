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
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_followed_community_empty_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const pageNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const pageLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const request = {
    page: pageNumber,
    limit: pageLimit,
  } satisfies ICommunityPlatformCommunity.IRequest;
  const page: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is positive",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination current matches requested page",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.equals("empty followed community list", page.data.length, 0);
  TestValidator.equals(
    "no followed community records",
    page.pagination.records,
    0,
  );
  TestValidator.equals("no followed community pages", page.pagination.pages, 0);
}
