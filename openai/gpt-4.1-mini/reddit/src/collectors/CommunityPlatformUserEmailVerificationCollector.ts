import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformUserEmailVerificationCollector {
  export async function collect(props: {
    body: ICommunityPlatformUserEmailVerification.ICreate;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      token: props.body.token,
      is_verified: props.body.is_verified,
      expires_at: new Date(props.body.expires_at),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.user.id } },
    } satisfies Prisma.community_platform_user_email_verificationsCreateInput;
  }
}
