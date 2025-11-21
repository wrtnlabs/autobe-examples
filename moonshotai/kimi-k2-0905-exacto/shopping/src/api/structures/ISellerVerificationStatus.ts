export namespace ISellerVerificationStatus {
  /**
   * Seller verification status for marketplace trust and compliance
   * monitoring. This indicates the current verification level of a seller
   * account within the platform's merchant verification system. Used in
   * seller management interfaces, verification dashboards, and marketplace
   * oversight tools to quickly assess seller credibility and compliance
   * status.
   */
  export type ISummary =
    | "unverified"
    | "pending"
    | "verified"
    | "rejected"
    | "expired";
}
