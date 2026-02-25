import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_user_email_verification } from "../prepare/prepare_random_community_platform_user_email_verification";

export async function generate_random_community_platform_user_email_verifications_create_email_verification(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformUserEmailVerification.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformUserEmailVerification> {
  const prepared: ICommunityPlatformUserEmailVerification.ICreate =
    prepare_random_community_platform_user_email_verification(props.body);
  const result: ICommunityPlatformUserEmailVerification =
    await api.functional.communityPlatform.user.email_verifications.createEmailVerification(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
