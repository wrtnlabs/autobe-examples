import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformMemberEmailVerificationCollector {
  export async function collect(props: {
    body: IRedditPlatformMemberEmailVerification.ICreate;
  }) {
    const id: string = crypto.randomUUID();
    const expires_at: Date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return {
      id,
      email: props.body.email,
      token: crypto.randomUUID(),
      expires_at,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: {
        connect: {
          id: props.body.reddit_platform_member_id,
        },
      },
    } satisfies Prisma.reddit_platform_member_email_verificationsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformMemberEmailVerificationCollector {
//         export async function collect(props: {
//           body: IRedditPlatformMemberEmailVerification.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       email: ...,
//       token: ...,
//       expires_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//           } satisfies Prisma.reddit_platform_member_email_verificationsCreateInput;
//         }
//       }
//--------------------------------------------------------------