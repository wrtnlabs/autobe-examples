import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_member_email_verification } from "../prepare/prepare_random_reddit_platform_member_email_verification";

/**
 * Generate a random email verification token for a Reddit platform member for E2E testing.
 *
 * Prepares random email verification data using the prepare function, then calls the API creation endpoint.
 * The function generates a cryptographically secure verification token associated with the member's email
 * address, which is sent to the user for email verification during registration.
 */
export async function generate_random_reddit_platform_member_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IRedditPlatformMemberEmailVerification.ICreate>
      | undefined;
  },
): Promise<IRedditPlatformMemberEmailVerification> {
  const prepared: IRedditPlatformMemberEmailVerification.ICreate =
    prepare_random_reddit_platform_member_email_verification(props.body);
  const result: IRedditPlatformMemberEmailVerification =
    await api.functional.redditPlatform.member.email_verifications.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
