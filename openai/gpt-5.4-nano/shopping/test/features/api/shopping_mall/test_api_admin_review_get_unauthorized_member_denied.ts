import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_admin_review_get_unauthorized_member_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberLoginConnection,
    {},
  );
  typia.assert(review);
  const forbiddenKeys = [
    "rating",
    "body",
    "product",
    "author",
    "orderItem",
  ] as const;
  await TestValidator.error("member cannot access admin review", async () => {
    try {
      await api.functional.shoppingMall.admin.reviews.at(
        memberLoginConnection,
        {
          reviewId: review.id,
        },
      );
    } catch (e: unknown) {
      if (e instanceof api.HttpError) {
        const json = e.toJSON<unknown>();
        const message: unknown = (
          json as {
            message?: unknown;
          }
        ).message;
        if (message !== null && typeof message === "object") {
          for (const k of forbiddenKeys) {
            TestValidator.predicate(
              `error must not include ${k}`,
              () => !(k in (message as Record<string, unknown>)),
            );
          }
        }
      }
      throw e;
    }
  });
  await TestValidator.error("guest cannot access admin review", async () => {
    const guestConnection: api.IConnection = { host: connection.host };
    try {
      await api.functional.shoppingMall.admin.reviews.at(guestConnection, {
        reviewId: review.id,
      });
    } catch (e: unknown) {
      if (e instanceof api.HttpError) {
        const json = e.toJSON<unknown>();
        const message: unknown = (
          json as {
            message?: unknown;
          }
        ).message;
        if (message !== null && typeof message === "object") {
          for (const k of forbiddenKeys) {
            TestValidator.predicate(
              `error must not include ${k}`,
              () => !(k in (message as Record<string, unknown>)),
            );
          }
        }
      }
      throw e;
    }
  });
}
