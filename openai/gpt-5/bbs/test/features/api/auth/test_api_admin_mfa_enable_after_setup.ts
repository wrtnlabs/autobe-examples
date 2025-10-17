import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAuthMfaMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAuthMfaMethod";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

export async function test_api_admin_mfa_enable_after_setup(
  connection: api.IConnection,
) {
  /**
   * Admin MFA enablement flow (join → setup → verify).
   *
   * Steps:
   *
   * 1. Register a brand new admin via /auth/admin/join (authenticated context is
   *    established by SDK)
   * 2. Start MFA enrollment via /auth/admin/mfa/setup with method "totp"
   * 3. Parse otpauth provisioning_uri, extract secret and parameters (digits,
   *    period)
   * 4. Generate valid TOTP and POST /auth/admin/mfa/verify with { code }
   * 5. Validate acknowledgement and timestamp; ensure replay of same code fails
   */

  // 1) Register admin (new user context)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;
  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussAdmin.IAuthorized>(authorized);

  // Optional initial assertion: MFA should be off before verification when subject provided
  if (authorized.admin !== undefined) {
    TestValidator.predicate(
      "mfaEnabled should be false before verification",
      authorized.admin.mfaEnabled === false,
    );
  }

  // 2) Start MFA enrollment (TOTP)
  const setup = await api.functional.auth.admin.mfa.setup.startMfaEnrollment(
    connection,
    { body: { method: "totp" } satisfies IEconDiscussAdmin.IMfaSetupRequest },
  );
  typia.assert<IEconDiscussAdmin.IMfaSetup>(setup);

  TestValidator.predicate(
    "provisioning_uri is otpauth uri",
    setup.provisioning_uri.toLowerCase().startsWith("otpauth://totp/"),
  );

  // 3) Parse provisioning URI to extract secret and parameters
  const parsed = new URL(setup.provisioning_uri);
  const secretParam = parsed.searchParams.get("secret");
  typia.assert<string>(secretParam!); // ensure secret exists
  const digitsRaw = parsed.searchParams.get("digits");
  const periodRaw = parsed.searchParams.get("period");
  const algoParam = parsed.searchParams.get("algorithm");
  const parsedDigits = digitsRaw !== null ? parseInt(digitsRaw, 10) : 6;
  const parsedPeriod = periodRaw !== null ? parseInt(periodRaw, 10) : 30;
  const digits =
    Number.isFinite(parsedDigits) && parsedDigits > 0 ? parsedDigits : 6;
  const period =
    Number.isFinite(parsedPeriod) && parsedPeriod > 0 ? parsedPeriod : 30;
  const algorithm = (algoParam ?? "SHA1").toUpperCase();

  TestValidator.equals(
    "totp digits honored",
    digits,
    digitsRaw !== null && Number.isFinite(parseInt(digitsRaw, 10))
      ? parseInt(digitsRaw, 10)
      : 6,
  );
  TestValidator.equals(
    "totp period honored",
    period,
    periodRaw !== null && Number.isFinite(parseInt(periodRaw, 10))
      ? parseInt(periodRaw, 10)
      : 30,
  );

  // RFC 6238 default algorithm is SHA1; only SHA1 is supported in this test helper
  TestValidator.predicate(
    "algorithm must be SHA1 for this test",
    algorithm === "SHA1",
  );

  // 3.1) Base32 decode (RFC 4648)
  const base32Decode = (b32: string): Uint8Array => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = b32.replace(/=+$/g, "").toUpperCase();
    let bits = "";
    for (let i = 0; i < clean.length; i++) {
      const val = alphabet.indexOf(clean[i]);
      if (val === -1) continue; // ignore non-base32 just in case
      bits += val.toString(2).padStart(5, "0");
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
  };

  // 3.2) SHA-1 implementation
  const sha1 = (message: Uint8Array): Uint8Array => {
    // Pre-processing (padding)
    const ml = message.length * 8;
    const withOne = new Uint8Array(message.length + 1);
    withOne.set(message);
    withOne[message.length] = 0x80;

    const mod64 = withOne.length % 64;
    const zeroPadLen = mod64 <= 56 ? 56 - mod64 : 56 + (64 - mod64);
    const padded = new Uint8Array(withOne.length + zeroPadLen + 8);
    padded.set(withOne);

    // Append 64-bit big-endian length
    const view = new DataView(padded.buffer);
    const hi = Math.floor(ml / 0x100000000);
    const lo = ml >>> 0;
    view.setUint32(padded.length - 8, hi);
    view.setUint32(padded.length - 4, lo);

    // Initial hash values
    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;

    const w = new Int32Array(80);
    for (let i = 0; i < padded.length; i += 64) {
      // Break chunk into sixteen 32-bit big-endian words
      for (let j = 0; j < 16; j++) {
        const idx = i + j * 4;
        w[j] =
          (padded[idx] << 24) |
          (padded[idx + 1] << 16) |
          (padded[idx + 2] << 8) |
          (padded[idx + 3] << 0);
      }
      // Extend to 80 words
      for (let j = 16; j < 80; j++) {
        const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
        w[j] = ((x << 1) | (x >>> 31)) >>> 0;
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;

      for (let j = 0; j < 80; j++) {
        let f = 0;
        let k = 0;
        if (j < 20) {
          f = (b & c) | (~b & d);
          k = 0x5a827999;
        } else if (j < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }
        const temp = (((a << 5) | (a >>> 27)) + f + e + k + (w[j] >>> 0)) >>> 0;
        e = d;
        d = c;
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = temp;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }

    const out = new Uint8Array(20);
    out[0] = (h0 >>> 24) & 0xff;
    out[1] = (h0 >>> 16) & 0xff;
    out[2] = (h0 >>> 8) & 0xff;
    out[3] = h0 & 0xff;
    out[4] = (h1 >>> 24) & 0xff;
    out[5] = (h1 >>> 16) & 0xff;
    out[6] = (h1 >>> 8) & 0xff;
    out[7] = h1 & 0xff;
    out[8] = (h2 >>> 24) & 0xff;
    out[9] = (h2 >>> 16) & 0xff;
    out[10] = (h2 >>> 8) & 0xff;
    out[11] = h2 & 0xff;
    out[12] = (h3 >>> 24) & 0xff;
    out[13] = (h3 >>> 16) & 0xff;
    out[14] = (h3 >>> 8) & 0xff;
    out[15] = h3 & 0xff;
    out[16] = (h4 >>> 24) & 0xff;
    out[17] = (h4 >>> 16) & 0xff;
    out[18] = (h4 >>> 8) & 0xff;
    out[19] = h4 & 0xff;
    return out;
  };

  // 3.3) HMAC-SHA1
  const hmacSha1 = (key: Uint8Array, data: Uint8Array): Uint8Array => {
    const blockSize = 64; // bytes
    let k = key;
    if (k.length > blockSize) k = sha1(k);
    if (k.length < blockSize) {
      const tmp = new Uint8Array(blockSize);
      tmp.set(k);
      k = tmp;
    }
    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      oKeyPad[i] = k[i] ^ 0x5c;
      iKeyPad[i] = k[i] ^ 0x36;
    }
    const inner = new Uint8Array(iKeyPad.length + data.length);
    inner.set(iKeyPad);
    inner.set(data, iKeyPad.length);
    const innerHash = sha1(inner);
    const outer = new Uint8Array(oKeyPad.length + innerHash.length);
    outer.set(oKeyPad);
    outer.set(innerHash, oKeyPad.length);
    return sha1(outer);
  };

  // 3.4) HOTP/TOTP code generation
  const hotp = (
    secret: Uint8Array,
    counter: number,
    codeDigits: number,
  ): string => {
    // 8-byte big-endian counter
    const buf = new Uint8Array(8);
    const dv = new DataView(buf.buffer);
    // Use two 32-bit halves to avoid BigInt
    const high = Math.floor(counter / 0x100000000);
    const low = counter >>> 0;
    dv.setUint32(0, high);
    dv.setUint32(4, low);

    const hmac = hmacSha1(secret, buf);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const p =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const mod = 10 ** codeDigits;
    const code = p % mod;
    return code.toString().padStart(codeDigits, "0");
  };

  const totp = (
    secretB32: string,
    codeDigits: number,
    stepSeconds: number,
  ): string => {
    const secret = base32Decode(secretB32);
    const now = Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / stepSeconds);
    return hotp(secret, counter, codeDigits);
  };

  // 4) Generate TOTP and verify
  const code = totp(secretParam!, digits, period);
  TestValidator.equals(
    "generated code length matches digits",
    code.length,
    digits,
  );

  const event = await api.functional.auth.admin.mfa.verify.verifyMfa(
    connection,
    {
      body: { code }, // Avoid `satisfies any`; IMfaVerifyRequest is any in provided types
    },
  );
  typia.assert<IEconDiscussAdmin.ISecurityEvent>(event);

  // Validate occurred_at recency (within 5 minutes)
  const nowMs = Date.now();
  const occurredMs = new Date(event.occurred_at).getTime();
  TestValidator.predicate(
    "occurred_at is recent (within 5 minutes)",
    Math.abs(nowMs - occurredMs) <= 5 * 60 * 1000,
  );

  // 5) Replay should fail for the same code
  await TestValidator.error(
    "replaying the same TOTP code should fail",
    async () => {
      await api.functional.auth.admin.mfa.verify.verifyMfa(connection, {
        body: { code },
      });
    },
  );
}
