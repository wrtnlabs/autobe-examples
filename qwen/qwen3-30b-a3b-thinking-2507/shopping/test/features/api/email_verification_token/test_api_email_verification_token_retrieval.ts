import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerificationToken";
export async function test_api_email_verification_token_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random token ID (UUID) for test purposes
  const emailVerificationTokenId = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint to retrieve token details
  const output: IShoppingMallEmailVerificationToken =
    await api.functional.shoppingMall.email_verification_tokens.at(connection, {
      emailVerificationTokenId: emailVerificationTokenId,
    });
  // Validate response type matches expected structure
  typia.assert(output);
}
