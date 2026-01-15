import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import type { IShoppingMallReviewVoteIpLocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVoteIpLocation";
import type { IShoppingMallReviewVotePlatformData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVotePlatformData";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_review_vote_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 2: Generate a random review ID for the vote update
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the review vote from 'helpful' to 'unhelpful'
  // The API endpoint supports UPSERT behavior, so this creates the vote if it doesn't exist
  const updatedVote: IShoppingMallReviewVote =
    await api.functional.shoppingMall.admin.reviews.votes.update(
      adminConnection,
      {
        reviewId,
        body: { value: "unhelpful" } satisfies IShoppingMallReviewVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Step 4: Validate the updated vote reflects the new status
  TestValidator.equals(
    "updated vote value is unhelpful",
    updatedVote.value,
    "unhelpful",
  );
  TestValidator.predicate(
    "updated vote has updated_at timestamp",
    updatedVote.updated_at > updatedVote.created_at,
  );
}
