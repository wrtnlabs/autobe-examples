import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_review_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connections for both member (review author) and admin actors
  const memberConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Member joins and logs in to create a review
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(8), // 8+ chars ensures compliance with spec
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 3: Admin joins and logs in to perform moderation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(8),
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 4: Generate valid UUID for reviewId. Since we don't have a review creation endpoint,
  // we assume a review exists with this ID as required for testing deletion.
  // The reviewId must be a valid UUID as per endpoint definition.
  const productCode = typia.random<string>();
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Admin deletes the review
  // The delete operation returns void, so no response to validate
  await api.functional.communityPlatform.member.products.reviews.erase(
    adminConnection,
    {
      productCode,
      reviewId,
    },
  );
}
